package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN020TrainLoadingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_020",
        title = "Train Loading",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_021,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_019,
        onNavigate = onNavigate,
    ) {
            MFSkeleton(358.dp,190.dp)
            MFSkeleton(358.dp,96.dp)
            MFSkeleton(358.dp,96.dp)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN020TrainLoadingScreenPreview() {
    MoveFuelTheme { TRN020TrainLoadingScreen {} }
}
