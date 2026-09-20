package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK007RepsInputScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_007",
        title = "Reps Input",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_006,
        onNavigate = onNavigate,
    ) {
            MFField("Actual reps","8","Performed fact")
            MFNotice("Prescription vs actual","The target remains visible but does not overwrite what you performed.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK007RepsInputScreenPreview() {
    MoveFuelTheme { WRK007RepsInputScreen {} }
}
