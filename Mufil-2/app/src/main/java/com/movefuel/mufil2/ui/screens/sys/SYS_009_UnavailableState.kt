package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS009UnavailableStateScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_009",
        title = "Unavailable State",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_008,
        onNavigate = onNavigate,
    ) {
            MFNotice("Feature unavailable","MoveFuel explains whether this is temporary, unsupported, or missing required data.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS009UnavailableStateScreenPreview() {
    MoveFuelTheme { SYS009UnavailableStateScreen {} }
}
