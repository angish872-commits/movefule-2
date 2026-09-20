package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS020RestoredFlowScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_020",
        title = "Restored Flow",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.MASTER_TODAY,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_019,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Restored","Your interrupted flow has been recovered.",MoveFuelColors.Success)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS020RestoredFlowScreenPreview() {
    MoveFuelTheme { SYS020RestoredFlowScreen {} }
}
